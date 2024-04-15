//<nowiki>
;( function( $ ) {
	var boxId = '#qvpb-box',
		comment = '',
		pageToQvfd,
		pageName = mw.config.get( 'wgPageName' ).replace( /_/g, ' ' ),
		hasHistory = !!$( '#ca-history' ).length,
		isRedirect = !!$( '#contentSub' ).text().match( /^redirect page$/i ),
		isRcOrNew = !!pageName.match( /Special:(NewPages|RecentChanges)/i ),
		scriptPath = mw.config.get( 'wgScriptPath' ) + '/api.php',
		// fix for IE instances with no open console
		console = window.console || { log: function() { } },
		savePage = 'SnowballaspediA:VPB/QVPB';

	// $( document ).ready() equivalent
	// This can be done before the actual function declaration because of "hoisting"
	$( init );

	function init() {
		if ( hasHistory ) {
			addControl();
		} else if ( isRcOrNew ) {
			addLinks();
		}

		// add a handler to make the input-box execute on ENTER press
		$( document ).on( 'keydown', '#qvpb-comment', function( e ) {
			if ( e.which == 13 ) {
				$( boxId ).trigger( 'qvpb:ok' );
			}
		} );
	}

	function addControl() {
		$( mw.util.addPortletLink( 'p-cactions', '#', 'QVPB', 't-qvpb', 'Añadir página a Borrado Rapido' ) )
			.click( function( e ) { run( e, pageName ); } );
	}

	function addLinks() {
		$( '#mw-content-text li, #mw-content-text table' ).each( function() {
			var $t = $( this ),
			title = $t.find( 'a.mw-changeslist-title, a.mw-newpages-pagename' ).attr( 'title' ),
			link = $( '<a/>', {
				href: 'javascript:void(0)',
				text: 'qvpb',
				click: function( e ) { run( e, title ); }
			} );
			if ( pageName.match( /Special:NewPages/i ) ) {
				$t.find( '.mw-newpages-history' ).after( ')' ).after( link ).after( ' (' );
			} else {
				$t.find( 'a[href*="action=history"]' ).after( link ).after( ' | ' );
			}
		} );
	}

	function run( e, title ) {
		pageToQvpb = title;
		e.preventDefault();
		$( '#qvpb-box' ).dialog( 'close' );
		$( '<div id="qvpb-box"></div>' )
			.append( '<p>Add comment:</p><input type="text" id="qvpb-comment" placeholder="optional"/>' )
			.dialog( {
				buttons: [
					{ text: 'Go', click: function() { $( this ).trigger( 'qvbp:ok' ); } },
					{ text: 'Cancel', click: function() { $( this ).dialog( 'close' ); } }
				],
				closeOnEscape: false,
				modal: true,
				close: function() {
					$( this ).dialog( 'destroy' ).remove();
				},
				title: 'Solicitud de borrado rapido'
			} )
			.bind( 'qvpb:ok', fetch );
	}

	function fetch() {
		comment = $( '#qvpb-comment' ).val();
		$( boxId ).empty()
			.css( 'font-size', '80%' )
			.dialog( 'option', 'title', 'Solicitando borrado rapido, espere...' )
			.dialog( 'option', 'buttons', [] );
		output( 'info', 'Loading', 'Página para Borrado rapido...' );
		$.get( scriptPath, {
			'action': 'query',
			'titles': savePage,
			'prop': 'revisions|info|links',
			'pllimit': 500,
			'rvprop': 'content',
			'rvlimit': 1,
			'rvsection': 1,
			'intoken': 'edit',
			'format': 'xml'
		} )
		.done( fetchDone )
		.fail( fetchFail );
	}

	function isListed( $xml, title ) {
		var listed = false;
		$xml.find( 'pl' ).each( function() {
			if ( $( this ).attr( 'title' ) == title ) {
				listed = true;
			}
		} );
		return listed;
	}

	function fetchDone( xml ) {
		var $xml = $( xml ),
			sectionText,
			line = ' ' + ( isRedirect ? '{{redirect|' + pageToQvpb + '}}' : '[[:' + pageToQvpb + ']]' )
				+ ( comment ? ' &#8212; ' + comment : '' );
		output( 'info', 'Checking', 'Borrado rapido para pagina seleccionada...' );
		if ( isListed( $xml, pageToQvpb ) ) {
			output( 'fail', 'Page', 'Ya esta en borrado rapido!' );
			addBackButtons();
			return;
		}
		output( 'info', 'Page', 'no listado, añadiendolo ahora...' );
		sectionText = $xml.find( 'rev:first' ).text().replace( /==(\n|$)/, '==\n' + line + '\n' );
		$.post( scriptPath, {
			'action': 'edit',
			'title': savePage,
			'section': 1,
			'token': $xml.find( 'page' ).attr( 'edittoken' ),
			'summary': '+[[' + pageToQvpb + ']] - via [[MediaWiki:Gadget-quickvpb.js|Gadget QVPB]]',
			'text': sectionText,
			'watchlist': 'nochange',
			'format': 'xml'
		} )
			.done( editDone )
			.fail( editFail );
	}

	function fetchFail( error ) {
		output( 'fail', 'Couldn\'t', 'Conectate a QVPB!' );
		addBackButtons();
		console.log( error );
	}

	function editDone( xml ) {
		var $xml = $( xml );
		if ( $xml.find( 'edit[result="Success"]' ).length ) {
			output( 'win', 'Guardado!' );
		} else {
			var $error = $xml.find( 'error' );
			output( 'fail', 'Guardado fallo', 
				'Error: ' + $error.attr( 'code' ) + ' - ' + $error.attr( 'info' ) );
		}
		addBackButtons();
	}

	function editFail() {
		output( 'fail', 'Conexion fallida' );
		addBackButtons();
	}

	function addBackButtons() {
		$( boxId ).dialog( 'option', { buttons: [
			{
				text: 'Ir a Borrado Rapido',
				click: function() {
					$( boxId ).dialog( 'close' );
					document.location.href = mw.util.wikiUrlencode( savePage );
				}
			},
			{ text: 'Close', click: function() { $( boxId ).dialog( 'close' ); } }
		] } );
	}

	function output( type, label, text ) {
		var indicator = type == 'fail' ? '&#160;x ' : type == 'win' ? '&#160;√ ' : '&#160;► ',
			str = '<p>' + indicator + '<b>' + ( label || '' ) + '</b> ' + ( text || '' ) + '</p>';
		$( boxId ).append( str )
			.css( 'color', ( type == 'fail' ? 'red' : type == 'win' ? 'green' : 'black' ) );
	}
})( jQuery );
